// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import axios from "axios";

export const dynamic = "force-dynamic";

const CHROMA_URL = process.env.CHROMA_URL || "http://chromadb:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const COLLECTION = "ncfn_juridico";

function isAdmin(token: any) {
    return token?.role === "admin";
}

// Textos jurídicos base para seed
const LEGAL_TEXTS = [
    { id: "cp_art_154a", text: "Art. 154-A CP — Invasão de dispositivo informático. Pena reclusão 1-4 anos. Qualificado: obtenção de conteúdo de comunicações privadas, segredos comerciais, dados sigilosos.", category: "crimes_digitais" },
    { id: "cp_art_171", text: "Art. 171 CP — Estelionato. Pena reclusão 1-5 anos. Fraude bancária digital, golpes via WhatsApp, phishing, clonagem de cartão.", category: "crimes_financeiros" },
    { id: "cp_art_297", text: "Art. 297 CP — Falsificação de documento público. Pena reclusão 2-6 anos. Documentos digitais com validade legal.", category: "fe_publica" },
    { id: "lei_9613_art1", text: "Lei 9.613/98 Art. 1º — Lavagem de dinheiro. Ocultar origem de bens ou valores provenientes de crimes. Pena reclusão 3-10 anos.", category: "corrupcao" },
    { id: "lei_11343_art33", text: "Lei 11.343/06 Art. 33 — Tráfico de drogas. Importar, exportar, preparar, produzir, fabricar, adquirir, vender. Pena reclusão 5-15 anos.", category: "trafico" },
    { id: "eca_art241a", text: "ECA Art. 241-A — Pornografia infantil. Oferecer, trocar, disponibilizar, transmitir, distribuir ou publicar por qualquer meio fotos ou vídeos com pornografia ou cenas de sexo explícito envolvendo criança. Pena reclusão 3-6 anos.", category: "eca" },
    { id: "marco_civil_art7", text: "Marco Civil Art. 7º — Direitos do usuário na internet: inviolabilidade da intimidade e da vida privada, sigilo do fluxo de comunicações, sigilo das comunicações privadas armazenadas, não fornecimento de dados pessoais a terceiros.", category: "privacidade" },
    { id: "marco_civil_art10", text: "Marco Civil Art. 10 — Guarda e disponibilização dos registros de conexão e de acesso a aplicações de internet. Provedor não pode fornecer dados sem ordem judicial.", category: "privacidade" },
    { id: "lgpd_art46", text: "LGPD Art. 46 — Agentes de tratamento devem adotar medidas de segurança para proteger dados pessoais. Violação deve ser comunicada à ANPD.", category: "protecao_dados" },
    { id: "cp_art159", text: "Art. 159 CP — Extorsão mediante sequestro (Ransom). Sequestrar pessoa com intuito de obter qualquer vantagem como condição. Inclui ransomware digital. Pena reclusão 8-15 anos.", category: "crimes_graves" },
    { id: "lei_12737", text: "Lei 12.737/2012 (Lei Carolina Dieckmann) — Crime de invasão de dispositivo informático. Devassar a intimidade, instalar vulnerabilidades, obter comunicações privadas.", category: "crimes_digitais" },
    { id: "cp_art307", text: "Art. 307 CP — Falsa identidade. Atribuir-se ou atribuir a terceiro falsa identidade para obter vantagem. Inclui fraudes de identidade online.", category: "fe_publica" },
];

async function getEmbedding(text: string): Promise<number[]> {
    const res = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
        model: "nomic-embed-text",
        prompt: text,
    }, { timeout: 30000 });
    return res.data.embedding;
}

async function ensureCollection() {
    try {
        await axios.get(`${CHROMA_URL}/api/v1/collections/${COLLECTION}`);
    } catch {
        await axios.post(`${CHROMA_URL}/api/v1/collections`, {
            name: COLLECTION,
            metadata: { description: "Base jurídica NCFN — CP, CPP, Marco Civil, ECA, LGPD" },
        });
    }
}

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isAdmin(token)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
        // Verificar status do ChromaDB
        try {
            const res = await axios.get(`${CHROMA_URL}/api/v1/heartbeat`, { timeout: 3000 });
            const colRes = await axios.get(`${CHROMA_URL}/api/v1/collections`, { timeout: 3000 });
            return NextResponse.json({
                online: true,
                collections: colRes.data.length,
                chromaUrl: CHROMA_URL,
            });
        } catch {
            return NextResponse.json({ online: false, error: "ChromaDB offline — ativar com: docker compose --profile rag up -d" });
        }
    }

    // Query semântico
    try {
        await ensureCollection();
        const embedding = await getEmbedding(query);
        const res = await axios.post(`${CHROMA_URL}/api/v1/collections/${COLLECTION}/query`, {
            query_embeddings: [embedding],
            n_results: 5,
            include: ["documents", "metadatas", "distances"],
        }, { timeout: 15000 });

        const results = res.data.documents[0].map((doc: string, i: number) => ({
            text: doc,
            metadata: res.data.metadatas[0][i],
            distance: res.data.distances[0][i],
        }));

        return NextResponse.json({ ok: true, results });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!isAdmin(token)) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

    const { action, query } = await req.json();

    // ── Seed textos jurídicos ─────────────────────────────────────────────────
    if (action === "seed") {
        try {
            await ensureCollection();
            const colRes = await axios.get(`${CHROMA_URL}/api/v1/collections/${COLLECTION}`);
            const collectionId = colRes.data.id;

            const embeddings = await Promise.all(LEGAL_TEXTS.map(t => getEmbedding(t.text)));

            await axios.post(`${CHROMA_URL}/api/v1/collections/${collectionId}/add`, {
                ids: LEGAL_TEXTS.map(t => t.id),
                embeddings,
                documents: LEGAL_TEXTS.map(t => t.text),
                metadatas: LEGAL_TEXTS.map(t => ({ category: t.category })),
            }, { timeout: 120000 });

            return NextResponse.json({ ok: true, seeded: LEGAL_TEXTS.length });
        } catch (err: any) {
            return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
        }
    }

    // ── Query + resposta IA ───────────────────────────────────────────────────
    if (action === "query") {
        try {
            await ensureCollection();
            const embedding = await getEmbedding(query);
            const res = await axios.post(`${CHROMA_URL}/api/v1/collections/${COLLECTION}/query`, {
                query_embeddings: [embedding],
                n_results: 3,
                include: ["documents", "metadatas"],
            }, { timeout: 15000 });

            const context = res.data.documents[0].join("\n\n");
            const prompt = `Você é um assistente jurídico forense especializado em direito penal brasileiro.

Com base nos seguintes artigos de lei:
${context}

Responda de forma objetiva e técnica em português: ${query}`;

            const aiRes = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "mistral", prompt, stream: false }),
                signal: AbortSignal.timeout(60000),
            });
            const aiData = await aiRes.json();

            return NextResponse.json({
                ok: true,
                answer: aiData.response,
                sources: res.data.documents[0],
            });
        } catch (err: any) {
            return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
        }
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}

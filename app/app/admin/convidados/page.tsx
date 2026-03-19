"use client";
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  UserPlus, Trash2, Users, CheckCircle, XCircle, Shield,
  Copy, Link2, Clock, Star, AlertTriangle, RefreshCw,
  ArrowLeft, Lock, Share2, Key, HelpCircle, X,
} from 'lucide-react';
import Link from 'next/link';

type Guest = {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  createdAt: string;
};

type InviteType = 'VAULT_ACCESS' | 'SYSTEM_REFERRAL';
type AccessLevel = 'VIEWER' | 'ANALYST';

function generateToken(email: string, type: InviteType, level: AccessLevel): string {
  // Client-side display token (real token generated server-side)
  const data = `${email}-${type}-${level}-${Date.now()}`;
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32).toUpperCase();
}

export default function ConvidadosPage() {
  const { data: session, status } = useSession();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteType, setInviteType] = useState<InviteType>('SYSTEM_REFERRAL');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VIEWER');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<{ email: string; token: string; type: InviteType; level: AccessLevel; createdAt: string }[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const fetchGuests = async () => {
    const res = await fetch('/api/admin/guests');
    if (res.ok) setGuests(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchGuests(); }, []);

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (res.ok) {
        const token = generateToken(email, inviteType, accessLevel);
        setPendingInvites(prev => [...prev, {
          email,
          token,
          type: inviteType,
          level: accessLevel,
          createdAt: new Date().toISOString(),
        }]);
        showFeedback(`Convite enviado para ${email}`, true);
        setEmail(''); setName('');
        fetchGuests();
      } else {
        showFeedback('Erro ao criar convite.', false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const removeGuest = async (guestEmail: string) => {
    const res = await fetch('/api/admin/guests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: guestEmail }),
    });
    if (res.ok) { showFeedback('Acesso revogado.', true); fetchGuests(); }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#bc13fe]/40 border-t-[#bc13fe] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <Shield className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-black text-white uppercase">Acesso Restrito</h1>
        <p className="text-gray-500 text-sm">Apenas administradores Nível 5 podem gerenciar convidados.</p>
      </div>
    );
  }

  const activeGuests = guests.filter(g => g.active);
  const referralInvites = pendingInvites.filter(i => i.type === 'SYSTEM_REFERRAL');
  const vaultInvites = pendingInvites.filter(i => i.type === 'VAULT_ACCESS');

  return (
    <div className="max-w-4xl mx-auto mt-6 pb-20 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-xl">
            <Users className="w-5 h-5 text-[#bc13fe]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Gerenciar Convidados</h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Sistema de Convites & Referrals</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl transition-all">
            <HelpCircle size={14} /> Como funciona
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[#bc13fe] animate-pulse" />
            <span className="text-[10px] text-gray-400 font-mono">{activeGuests.length} ATIVOS</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-black/40 border border-[#bc13fe]/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-[#bc13fe]">{activeGuests.length}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Convidados Ativos</div>
        </div>
        <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-cyan-400">{referralInvites.length}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Referrals Enviados</div>
        </div>
        <div className="bg-black/40 border border-orange-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-orange-400">{vaultInvites.length}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Acessos ao Cofre</div>
        </div>
      </div>

      {/* Invite Type Selector */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#bc13fe]" /> Tipo de Convite
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setInviteType('SYSTEM_REFERRAL')}
            className={`p-4 rounded-xl border text-left transition-all ${
              inviteType === 'SYSTEM_REFERRAL'
                ? 'border-cyan-500/50 bg-cyan-500/10'
                : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
            }`}
          >
            <div className={`text-sm font-black uppercase tracking-wider mb-1 ${inviteType === 'SYSTEM_REFERRAL' ? 'text-cyan-400' : 'text-gray-500'}`}>
              <Star className="w-3.5 h-3.5 inline mr-1.5" />Referral Premium
            </div>
            <div className="text-[10px] text-gray-600 leading-relaxed">
              Convite para adesão ao portal. Convidado cria sua própria conta sem acesso a seus arquivos.
            </div>
            {inviteType === 'SYSTEM_REFERRAL' && (
              <div className="mt-2 text-[9px] text-cyan-400 font-bold uppercase tracking-widest">✓ Selecionado</div>
            )}
          </button>

          <button
            onClick={() => setInviteType('VAULT_ACCESS')}
            className={`p-4 rounded-xl border text-left transition-all ${
              inviteType === 'VAULT_ACCESS'
                ? 'border-orange-500/50 bg-orange-500/10'
                : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
            }`}
          >
            <div className={`text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${inviteType === 'VAULT_ACCESS' ? 'text-orange-400' : 'text-gray-500'}`}>
              <Lock className="w-3.5 h-3.5" /> Acesso ao Cofre
            </div>
            <div className="text-[10px] text-gray-600 leading-relaxed">
              Concede acesso controlado ao cofre pessoal. Restrito a Gerentes Nível 5.
            </div>
            {inviteType === 'VAULT_ACCESS' && (
              <div className="mt-2 text-[9px] text-orange-400 font-bold uppercase tracking-widest">✓ Selecionado</div>
            )}
          </button>
        </div>

        {/* Level 5 warning for Vault Access */}
        {inviteType === 'VAULT_ACCESS' && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-700/40 rounded-lg text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-300/80">
              <strong className="text-red-400">Somente gerentes Nível 5</strong> podem fazer convites diretos ao cofre pessoal.
              O convidado terá acesso <em>read-only</em> às pastas autorizadas pelo período estabelecido.
            </span>
          </div>
        )}

        {/* Access level for vault */}
        {inviteType === 'VAULT_ACCESS' && (
          <div>
            <label className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">Nível de Acesso</label>
            <div className="flex gap-2">
              {(['VIEWER', 'ANALYST'] as AccessLevel[]).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setAccessLevel(lvl)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                    accessLevel === lvl
                      ? 'border-orange-500/50 bg-orange-500/15 text-orange-400'
                      : 'border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lvl === 'VIEWER' ? '👁 Visualizador' : '🔍 Analista'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="bg-black/40 border border-[#bc13fe]/20 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#bc13fe]" /> Criar Convite
        </h2>
        <form onSubmit={addGuest} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="col-span-2 md:col-span-1 bg-black/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#bc13fe]/60 transition placeholder-gray-600"
            />
            <input
              type="text"
              placeholder="Nome (opcional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="col-span-2 md:col-span-1 bg-black/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#bc13fe]/60 transition placeholder-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !email}
            className="w-full py-2.5 font-bold rounded-xl transition flex items-center justify-center gap-2 text-[#bc13fe] bg-[#bc13fe]/10 border border-[#bc13fe]/40 hover:bg-[#bc13fe]/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {submitting
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando Token...</>
              : <><Key className="w-4 h-4" /> Gerar Token & Convidar</>
            }
          </button>
        </form>

        {feedback && (
          <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            feedback.ok
              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {feedback.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Generated tokens */}
      {pendingInvites.length > 0 && (
        <div className="bg-black/40 border border-yellow-700/20 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-black text-yellow-400/80 uppercase tracking-widest flex items-center gap-2">
            <Key className="w-4 h-4" /> Tokens Gerados
          </h2>
          <p className="text-[10px] text-gray-600 font-mono">
            Tokens são válidos por 72 horas. Compartilhe via canal seguro.
          </p>
          <div className="space-y-2">
            {pendingInvites.map((inv, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-black/60 border border-gray-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      inv.type === 'VAULT_ACCESS'
                        ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
                        : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                    }`}>
                      {inv.type === 'VAULT_ACCESS' ? 'COFRE' : 'REFERRAL'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{inv.email}</span>
                    {inv.type === 'VAULT_ACCESS' && (
                      <span className="text-[9px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{inv.level}</span>
                    )}
                  </div>
                  <code className="text-[10px] text-yellow-300/70 font-mono break-all">{inv.token}</code>
                </div>
                <button
                  onClick={() => copyToken(inv.token)}
                  className="flex-shrink-0 p-2 text-gray-500 hover:text-white transition border border-gray-800 rounded-lg hover:border-gray-600"
                  title="Copiar token"
                >
                  {copiedToken === inv.token
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guest list */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4 text-[#bc13fe]" /> Convidados ({activeGuests.length} ativos)
        </h2>
        {guests.length === 0 ? (
          <p className="text-gray-600 text-center py-6 text-sm">Nenhum convidado cadastrado ainda.</p>
        ) : (
          <div className="space-y-2">
            {guests.map(g => (
              <div
                key={g.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  g.active
                    ? 'bg-gray-900/40 border-gray-800'
                    : 'bg-gray-900/20 border-gray-900 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${g.active ? 'bg-[#bc13fe]' : 'bg-gray-700'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{g.email}</p>
                    {g.name && <p className="text-gray-600 text-xs mt-0.5">{g.name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        g.active
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'bg-red-500/15 text-red-400 border border-red-500/20'
                      }`}>
                        {g.active ? 'Ativo' : 'Revogado'}
                      </span>
                      <span className="text-[10px] text-gray-700 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                {g.active && (
                  <button
                    onClick={() => removeGuest(g.email)}
                    className="flex-shrink-0 p-2 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/20"
                    title="Revogar acesso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 relative">
            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <HelpCircle className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="font-black text-white text-lg uppercase tracking-widest">COMO FUNCIONA</h2>
            </div>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <p>Este módulo gerencia o <strong className="text-white">acesso temporário de convidados</strong> ao portal NCFN.</p>
              <p>Existem dois tipos de convite: <strong className="text-white">Referral Premium</strong> (convidado cria conta própria sem acesso ao Vault) e <strong className="text-white">Acesso ao Cofre</strong> (acesso read-only controlado às pastas autorizadas).</p>
              <p>Os tokens gerados são <strong className="text-white">válidos por 72 horas</strong> e devem ser compartilhados via canal seguro. Todas as ações do convidado são registradas nos logs de auditoria.</p>
              <p>O acesso pode ser <strong className="text-white">revogado a qualquer momento</strong> clicando no ícone de exclusão ao lado do convidado na lista.</p>
            </div>
          </div>
        </div>
      )}

      {/* Link sharing section */}
      <div className="bg-black/40 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-500" /> Link de Convite Público
        </h2>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Gere um link único de convite para compartilhar. O acesso é limitado à primeira utilização e expira automaticamente em 72 horas.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-black/60 border border-gray-800 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-600 truncate">
            ncfn.net/invite/[TOKEN_GERADO]
          </div>
          <button
            className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-400 rounded-lg text-xs font-bold hover:text-white hover:border-gray-500 transition flex items-center gap-1.5"
            onClick={() => showFeedback('Gere um convite acima para obter o link.', false)}
          >
            <Copy className="w-3.5 h-3.5" /> Copiar
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil, ShieldCheck, User, X, Loader2, Eye, EyeOff } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastSeenAt: string | null;
  totpEnabled: boolean;
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", user: "Usuário", guest: "Convidado" };
const ROLE_COLOR: Record<string, string> = {
  admin: "text-[#bc13fe] border-[#bc13fe]/40 bg-[#bc13fe]/10",
  user:  "text-cyan-400 border-cyan-400/40 bg-cyan-400/10",
  guest: "text-gray-400 border-gray-600 bg-gray-800/40",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0d0d0d] border border-[#bc13fe]/20 rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm pr-10 focus:outline-none focus:border-[#bc13fe]/60 transition-colors"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function UsuariosPage() {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // Modal criar
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail]     = useState("");
  const [newName, setNewName]       = useState("");
  const [newPass, setNewPass]       = useState("");
  const [newRole, setNewRole]       = useState("user");
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState("");

  // Modal editar
  const [editUser, setEditUser]     = useState<UserRow | null>(null);
  const [editName, setEditName]     = useState("");
  const [editRole, setEditRole]     = useState("user");
  const [editPass, setEditPass]     = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr]       = useState("");

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/auth/register");
    const d = await r.json();
    setUsers(d.users ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaveErr("");
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, name: newName, password: newPass, role: newRole }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setSaveErr(d.error ?? "Erro ao criar"); return; }
    setShowCreate(false); setNewEmail(""); setNewName(""); setNewPass(""); setNewRole("user");
    load();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true); setEditErr("");
    const body: any = { id: editUser.id, name: editName, role: editRole };
    if (editPass) body.password = editPass;
    const r = await fetch("/api/auth/register", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setEditSaving(false);
    if (!r.ok) { setEditErr(d.error ?? "Erro ao salvar"); return; }
    setEditUser(null); setEditPass("");
    load();
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Remover usuário ${user.email}?`)) return;
    await fetch("/api/auth/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Gerenciar Usuários</h1>
          <p className="text-gray-500 text-sm mt-0.5">Cadastre e gerencie contas de acesso ao portal</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#bc13fe] hover:bg-[#bc13fe]/80 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <UserPlus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="border border-[#bc13fe]/15 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#bc13fe]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">Nenhum usuário cadastrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#bc13fe]/5 border-b border-[#bc13fe]/10">
              <tr>
                {["Nome", "Email", "Role", "Último acesso", "2FA", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                    {u.role === "admin"
                      ? <ShieldCheck className="w-4 h-4 text-[#bc13fe] shrink-0" />
                      : <User className="w-4 h-4 text-gray-500 shrink-0" />
                    }
                    {u.name}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLOR[u.role] ?? ROLE_COLOR.guest}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono ${u.totpEnabled ? "text-green-400" : "text-gray-600"}`}>
                      {u.totpEnabled ? "Ativo" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setEditUser(u); setEditName(u.name); setEditRole(u.role); setEditPass(""); setEditErr(""); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar */}
      {showCreate && (
        <Modal title="Novo Usuário" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors"
                placeholder="usuario@ncfn.local" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Nome</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors"
                placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Senha</label>
              <PasswordInput value={newPass} onChange={setNewPass} />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)}
                className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors">
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
                <option value="guest">Convidado</option>
              </select>
            </div>
            {saveErr && <p className="text-red-400 text-xs">{saveErr}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#bc13fe] hover:bg-[#bc13fe]/80 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar */}
      {editUser && (
        <Modal title={`Editar — ${editUser.email}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Nome</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Nova Senha (deixe vazio para manter)</label>
              <PasswordInput value={editPass} onChange={setEditPass} placeholder="Nova senha (opcional)" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Role</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)}
                className="w-full bg-black/40 border border-[#bc13fe]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bc13fe]/60 transition-colors">
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
                <option value="guest">Convidado</option>
              </select>
            </div>
            {editErr && <p className="text-red-400 text-xs">{editErr}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#bc13fe] hover:bg-[#bc13fe]/80 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { mockAdminUsers } from '@/data/mockData';

const AccountManagement = () => {
  const [accounts, setAccounts] = useState(mockAdminUsers.map((u, i) => ({ ...u, id: String(i) })));
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');

  const addAccount = () => {
    if (!newUser.trim() || !newPass.trim()) return;
    setAccounts((prev) => [...prev, { id: Date.now().toString(), username: newUser.trim(), password: newPass.trim() }]);
    setNewUser('');
    setNewPass('');
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">管理後台登入之帳號密碼</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> 新增帳號
        </button>
      </div>

      {showAdd && (
        <div className="bg-muted rounded-lg p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="帳號" className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground text-sm outline-none" />
          <input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="密碼" type="password" className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground text-sm outline-none" />
          <div className="flex gap-2">
            <button onClick={addAccount} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">確認</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md bg-muted text-muted-foreground text-sm border">取消</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">帳號</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">密碼</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-b border-border/50">
                <td className="px-4 py-3 text-foreground">{acc.username}</td>
                <td className="px-4 py-3 text-muted-foreground">••••••</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setAccounts((p) => p.filter((a) => a.id !== acc.id))} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountManagement;

import { useState, useEffect } from 'react';
import { X, Plus, Check, Trash2 } from 'lucide-react';
import { LuggageCategory } from '@/types/trip';

interface Props {
  open: boolean;
  onClose: () => void;
  luggageList: LuggageCategory[];
  onUpdate?: (list: LuggageCategory[]) => void;
}

const LuggageModal = ({ open, onClose, luggageList, onUpdate }: Props) => {
  const [categories, setCategories] = useState<LuggageCategory[]>(luggageList);
  const [newCategory, setNewCategory] = useState('');
  const [newItems, setNewItems] = useState<Record<string, string>>({});

  useEffect(() => {
    setCategories(luggageList);
  }, [luggageList]);

  if (!open) return null;

  const addCategory = () => {
    if (!newCategory.trim()) return;
    const next = [...categories, { id: Date.now().toString(), name: newCategory.trim(), items: [] }];
    setCategories(next);
    onUpdate?.(next);
    setNewCategory('');
  };

  const deleteCategory = (catId: string) => {
    const next = categories.filter((c) => c.id !== catId);
    setCategories(next);
    onUpdate?.(next);
  };

  const addItem = (catId: string) => {
    const text = newItems[catId]?.trim();
    if (!text) return;
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: [...c.items, { id: Date.now().toString(), text, checked: false }] } : c
    );
    setCategories(next);
    onUpdate?.(next);
    setNewItems((prev) => ({ ...prev, [catId]: '' }));
  };

  const toggleItem = (catId: string, itemId: string) => {
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, checked: !i.checked } : i) } : c
    );
    setCategories(next);
    onUpdate?.(next);
  };

  const deleteItem = (catId: string, itemId: string) => {
    const next = categories.map((c) =>
      c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
    );
    setCategories(next);
    onUpdate?.(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-primary/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">行李清單</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <div className="p-6 space-y-6">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">{cat.name}</p>
                <button onClick={() => deleteCategory(cat.id)} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleItem(cat.id, item.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        item.checked ? 'bg-secondary border-secondary' : 'border-border'
                      }`}
                    >
                      {item.checked && <Check className="h-3 w-3 text-secondary-foreground" />}
                    </button>
                    <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.text}</span>
                    <button onClick={() => deleteItem(cat.id, item.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <input
                    value={newItems[cat.id] || ''}
                    onChange={(e) => setNewItems((p) => ({ ...p, [cat.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addItem(cat.id)}
                    placeholder="新增項目..."
                    className="flex-1 text-xs px-2 py-1 rounded border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button onClick={() => addItem(cat.id)} className="text-secondary hover:text-secondary/80">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="新增分類..."
              className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addCategory} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LuggageModal;

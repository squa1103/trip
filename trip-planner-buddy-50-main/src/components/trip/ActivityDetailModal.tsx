import { X, ExternalLink } from 'lucide-react';
import { ActivityCard } from '@/types/trip';

interface Props {
  activity: ActivityCard;
  onClose: () => void;
}

const ActivityDetailModal = ({ activity, onClose }: Props) => {
  const isUrl = activity.address?.startsWith('http');

  return (
    <div className="fixed inset-0 z-50 bg-primary/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Cover */}
        <div className="relative">
          {activity.coverImage && (
            <img src={activity.coverImage} alt={activity.title} className="w-full h-48 object-cover rounded-t-xl" />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/50 text-white flex items-center justify-center hover:bg-primary/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">{activity.title}</h3>
            {activity.type && (
              <span className="px-2.5 py-1 bg-secondary/20 text-secondary text-xs rounded-full font-medium">{activity.type}</span>
            )}
          </div>

          {activity.address && (
            isUrl ? (
              <a href={activity.address} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-secondary hover:underline">
                查看地圖 <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{activity.address}</p>
            )
          )}

          {activity.notes && (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">備註</p>
              <div className="rich-html text-sm text-table-foreground" dangerouslySetInnerHTML={{ __html: activity.notes }} />
            </>
          )}

          <hr className="border-border" />

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">價格</span>
              <span className="font-medium text-foreground">¥{activity.price.toLocaleString()}</span>
            </div>
            {activity.payers && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">付款人</span>
                <span className="text-foreground">{activity.payers}</span>
              </div>
            )}
            {activity.memberCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">應付人數</span>
                <span className="text-foreground">{activity.memberCount} 人</span>
              </div>
            )}
            {activity.members && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">應付人員</span>
                <span className="text-foreground" dangerouslySetInnerHTML={{ __html: activity.members }} />
              </div>
            )}
            {activity.amountPerPerson > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">每人應付金額</span>
                <span className="font-medium text-secondary">¥{activity.amountPerPerson.toLocaleString()}/人</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">結算狀態</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                activity.settlementStatus === 'settled'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {activity.settlementStatus === 'settled' ? '已結清' : '未結清'}
              </span>
            </div>
          </div>

          {/* Receipts */}
          {activity.receipts && activity.receipts.length > 0 && (
            <>
              <hr className="border-border" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">收據附件</p>
                <div className="grid grid-cols-3 gap-2">
                  {activity.receipts.map((receipt, idx) => (
                    <a key={idx} href={receipt} target="_blank" rel="noopener noreferrer">
                      <img src={receipt} alt={`收據 ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailModal;

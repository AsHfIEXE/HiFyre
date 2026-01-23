import { useDownloadStore } from '../lib/downloads';
import { Download, Check, AlertTriangle, X } from 'lucide-react';

export function DownloadsPage() {
    const { tasks, removeTask, cancelTask } = useDownloadStore();

    // Sort: downloading/pending first, then completed/error
    const sortedTasks = [...tasks].sort((a, b) => {
        const score = (status: string) => {
            if (status === 'downloading') return 0;
            if (status === 'pending') return 1;
            return 2;
        };
        return score(a.status) - score(b.status);
    });

    return (
        <div className="downloads-page">
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>
                Downloads
            </h1>

            {sortedTasks.length === 0 ? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 'var(--space-12)', color: 'var(--muted-foreground)', gap: 'var(--space-4)'
                }}>
                    <Download size={48} opacity={0.5} />
                    <p>No downloads yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {sortedTasks.map((task) => (
                        <div key={task.id} style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-4)',
                            display: 'flex', alignItems: 'center', gap: 'var(--space-4)'
                        }}>
                            <div style={{
                                width: 40, height: 40,
                                background: 'var(--secondary)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {task.status === 'completed' ? <Check size={20} color="#10b981" /> :
                                    task.status === 'error' ? <AlertTriangle size={20} color="#ef4444" /> :
                                        <Download size={20} />}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 'var(--font-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {task.name}
                                    </span>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}>
                                        {task.status === 'downloading' ? `${task.progress}%` :
                                            task.status === 'completed' ? 'Done' :
                                                task.status === 'error' ? 'Failed' : 'Pending'}
                                    </span>
                                </div>

                                {task.status === 'downloading' || task.status === 'pending' ? (
                                    <div style={{ height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${task.progress}%`,
                                            background: 'var(--highlight)',
                                            transition: 'width 0.2s'
                                        }} />
                                    </div>
                                ) : task.status === 'error' ? (
                                    <div style={{ fontSize: 'var(--text-xs)', color: '#ef4444' }}>
                                        {task.error}
                                    </div>
                                ) : null}
                            </div>

                            <button
                                onClick={() => task.status === 'downloading' || task.status === 'pending' ? cancelTask(task.id) : removeTask(task.id)}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--muted-foreground)',
                                    cursor: 'pointer', padding: 4
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

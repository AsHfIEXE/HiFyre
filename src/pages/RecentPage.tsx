// Recent Page

export function RecentPage() {
    return (
        <div className="recent-page">
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-6)' }}>
                Recently Played
            </h1>

            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--muted)' }}>
                <p>Your listening history will appear here</p>
            </div>
        </div>
    );
}

function Error({ statusCode }: { statusCode?: number }) {
    return (
        <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'monospace', background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '72px', fontWeight: 900, margin: 0 }}>{statusCode || '?'}</h1>
            <p style={{ color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}>
                {statusCode === 404 ? 'Página não encontrada' : 'Erro interno do servidor'}
            </p>
        </div>
    )
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }, err?: { statusCode: number } }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}

export default Error

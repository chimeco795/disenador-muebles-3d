import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';
class ErrorBoundary extends Component<{
    children: ReactNode;
}, {
    error: boolean;
}> {
    state = { error: false };
    static getDerivedStateFromError() { return { error: true }; }
    render() { return this.state.error ? <div className="fatal"><h1>No se pudo iniciar el editor 3D.</h1><p>Comprueba que tu navegador tenga WebGL y aceleración gráfica activados. Tu proyecto guardado permanece en este navegador.</p><button onClick={() => location.reload()}>Volver a intentar</button></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>);

'use client';
import { Component } from 'react';

export default class BlocoErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro no bloco:', erro, info);
  }

  render() {
    if (this.state.erro) {
      return (
        <div style={{
          padding: 20,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 12,
          color: '#991B1B',
          fontSize: 13
        }}>
          <b>Esse bloco teve um erro:</b>
          <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {this.state.erro.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
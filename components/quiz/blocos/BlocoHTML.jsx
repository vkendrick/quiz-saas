'use client';

export default function BlocoHTML({ config, tema }) {
  return (
    <div>
      {config.css_extra && (
        <style dangerouslySetInnerHTML={{ __html: config.css_extra }} />
      )}
      <div
        style={{
          paddingTop: config.espacamento_topo || 0,
          paddingBottom: config.espacamento_base || 0
        }}
        dangerouslySetInnerHTML={{ __html: config.html || '<p>Bloco HTML vazio</p>' }}
      />
    </div>
  );
}
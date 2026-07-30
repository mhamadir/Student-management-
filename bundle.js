import * as esbuild from 'esbuild';
import fs from 'fs';

async function build() {
  const result = await esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'MyApp',
    external: ['react', 'react-dom', 'lucide-react', 'recharts', 'jspdf', 'jspdf-autotable', 'clsx', 'tailwind-merge'],
    write: false,
  });

  const code = result.outputFiles[0].text;
  console.log('JS Size:', code.length);
}
build();

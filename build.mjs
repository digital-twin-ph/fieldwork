import {build} from 'esbuild';
await build({entryPoints:['canvas.jsx'],bundle:true,format:'esm',outdir:'build',minify:true,define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
console.log('Built local React Flow assets.');

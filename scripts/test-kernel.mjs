// Runs the Rust kernel's own unit tests, so a change to kernel/src is checked where it is made, not only after the
// rebuilt module reaches the TypeScript tests. One thread at a time: each module keeps its arrays in statics, as the
// single-threaded wasm module it compiles to does, so two tests running at once write over each other. Run in
// parallel on 2026-11-25, two of the abm and declared tests failed on every run; on one thread all passed.
//
// cargo is looked for on PATH and then where rustup installs it, because a shell started from a profile that does not
// add ~/.cargo/bin still has a toolchain. If there is none the step fails: a gate that skipped the kernel and reported
// green would be claiming a check it did not run.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

const exe=process.platform==='win32'?'cargo.exe':'cargo';
const candidates=[process.env.CARGO,process.env.CARGO_HOME&&join(process.env.CARGO_HOME,'bin',exe),join(homedir(),'.cargo','bin',exe)].filter(Boolean);
const onPath=spawnSync(exe,['--version'],{stdio:'ignore'}).status===0;
const cargo=onPath?exe:candidates.find(path=>existsSync(path));
if(!cargo){
  console.error('The kernel tests need cargo, and none was found on PATH or in ~/.cargo/bin. Install Rust from https://rustup.rs.');
  process.exit(1);
}
const result=spawnSync(cargo,['test','--manifest-path','kernel/Cargo.toml','--quiet','--','--test-threads=1'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;

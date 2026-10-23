import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

/** The text of a downloaded file, whether or not it arrived compressed.
 *
 *  Exports have been gzip since 2026-10-22 -- the practitioner, after a 20 MB import limit
 *  refused the backup they had taken to rescue their work: *"Why don't we zip it as an export and
 *  unzip it upon import?"* A project document compresses about 25 to 1. Tests that read an export
 *  should not care which it is, for the same reason the import does not: the file says so itself,
 *  in its first two bytes. */
export async function downloadText(fileOrPath){
  const path=typeof fileOrPath==='string'?fileOrPath:await fileOrPath.path();
  const bytes=await readFile(path);
  return bytes[0]===0x1f&&bytes[1]===0x8b?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8');
}

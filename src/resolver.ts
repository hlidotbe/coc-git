import { Document, Uri, workspace } from 'coc.nvim'
import path from 'path'
import Git from './git'

export default class Resolver {
  private resolvedRoots: Set<string> = new Set()
  constructor(private git: Git) {
  }

  public getGitRoot(fullpath: string): string | null {
    if (process.platform == 'win32') {
      fullpath = path.win32.normalize(fullpath)
    }
    for (let p of this.resolvedRoots) {
      let rel = path.relative(p, fullpath)
      if (!rel.startsWith('..')) return p
    }
    return null
  }

  public getRootOfDocument(document: Document): string | null {
    if (document.schema != 'file' || document.buftype != '') return null
    return this.getGitRoot(Uri.parse(document.uri).fsPath)
  }

  public async resolveGitRoot(doc?: Document): Promise<string> {
    let dir: string
    if (!doc || doc.buftype != '' || doc.schema != 'file') {
      dir = workspace.cwd
    } else {
      let u = Uri.parse(doc.uri)
      dir = path.dirname(u.fsPath)
    }
    let root = this.getGitRoot(dir)
    if (root) return root
    let parts = dir.split(path.sep)
    let idx = parts.indexOf('.git')
    if (idx !== -1) {
      let root = parts.slice(0, idx).join(path.sep)
      this.resolvedRoots.add(root)
      return root
    }
    try {
      let res = await this.git.getRepositoryRoot(dir)
      if (path.isAbsolute(res)) {
        this.resolvedRoots.add(res)
        return res
      }
    } catch (e) {
      return
    }
  }
}

// 型定義ファイル
declare module '@mastra/core' {
  export class Mastra {
    constructor(config: any)
  }
  
  export class Agent {
    constructor(config: any)
    run(input: any): Promise<any>
  }
  
  export class Tool {
    constructor(config: any)
  }
  
  export class Workflow {
    constructor(config: any)
    run(input: any): Promise<any>
  }
  
  export class Step {
    constructor(config: any)
  }
}

declare module '@mastra/libsql' {
  export class LibsqlEngine {
    constructor(config: any)
  }
}

declare module '@mastra/memory' {
  export class MemoryKV {
    constructor()
  }
}
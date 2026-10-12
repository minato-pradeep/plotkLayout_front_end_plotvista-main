declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    text(text: string, x: number, y: number, options?: any): void;
    setFont(fontName: string, fontStyle?: string): void;
    setFontSize(size: number): void;
    save(filename: string): void;
    autoTable(options: any): void;
  }
}

declare module 'jspdf-autotable' {
  export {};
}

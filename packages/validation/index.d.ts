export declare function ehEmailValido(str?: string | null): boolean;
export declare function ehCPFValido(str?: string | null): boolean;
export declare function ehCNPJValido(str?: string | null): boolean;
export declare function ehSenhaForte(str?: string | null): boolean;

export declare const UFS_BRASIL: readonly string[];
export declare const ESPECIES_ANIMAIS: readonly string[];

export declare function validarCrmv(crmv?: string | number | null, uf?: string | null): boolean;
export declare function validarPesoGramas(pesoGrams?: number | string | null, min?: number, max?: number): boolean;
export declare function validarCrf(crf?: string | number | null, uf?: string | null): boolean;
export declare function validarRegistroMapa(registro?: string | number | null): boolean;

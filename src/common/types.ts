export type MutablePoint = {
    x: bigint;
    y: bigint;
    z: bigint;
    t: bigint;
}

export type Pattern = {
    match: bigint;
    mask: bigint;
};

export type Options = {
    prefix?: string;
    suffix?: string;
    batchSize?: number;
    benchmark?: boolean;
}

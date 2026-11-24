import { proto } from '../../WAProto/index.js';
import { type BinaryNode } from './types.js';
export declare const getBinaryNodeChildren: (node: BinaryNode | undefined, childTag: string) => BinaryNode[];
export declare const getBinaryNodeChild: (node: BinaryNode | undefined, childTag: string) => BinaryNode | undefined;
export declare const getAllBinaryNodeChildren: ({ content }: BinaryNode) => BinaryNode[];
export declare const getBinaryNodeChildBuffer: (node: BinaryNode | undefined, childTag: string) => Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike> | undefined;
export declare const getBinaryNodeChildString: (node: BinaryNode | undefined, childTag: string) => string | undefined;
export declare const getBinaryNodeChildUInt: (node: BinaryNode, childTag: string, length: number) => number | undefined;
export declare const assertNodeErrorFree: (node: BinaryNode) => void;
export declare const reduceBinaryNodeToDictionary: (node: BinaryNode, tag: string) => {
    [_: string]: string;
};
export declare const getBinaryNodeMessages: ({ content }: BinaryNode) => proto.WebMessageInfo[];
export declare function binaryNodeToString(node: BinaryNode | BinaryNode['content'], i?: number): string;
/** Detects whether a relayed protobuf message requires biz/interactive stanza nodes. */
export declare const getButtonType: (message: proto.IMessage) => string | null;
/** Checks whether caller-supplied additionalNodes already include a biz/bot interactive wrapper. */
export declare const getBinaryFilteredButtons: (nodeContent: BinaryNode[]) => boolean;
/** Builds the `<biz>` stanza child node required by WhatsApp for nativeFlow/buttons/list messages. */
export declare const getButtonArgs: (message: proto.IMessage) => BinaryNode[];
//# sourceMappingURL=generic-utils.d.ts.map
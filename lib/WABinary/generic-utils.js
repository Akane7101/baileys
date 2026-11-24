import { Boom } from '@hapi/boom';
import { proto } from '../../WAProto/index.js';
import {} from './types.js';
// some extra useful utilities
const indexCache = new WeakMap();
export const getBinaryNodeChildren = (node, childTag) => {
    if (!node || !Array.isArray(node.content))
        return [];
    let index = indexCache.get(node);
    // Build the index once per node
    if (!index) {
        index = new Map();
        for (const child of node.content) {
            let arr = index.get(child.tag);
            if (!arr)
                index.set(child.tag, (arr = []));
            arr.push(child);
        }
        indexCache.set(node, index);
    }
    // Return first matching child
    return index.get(childTag) || [];
};
export const getBinaryNodeChild = (node, childTag) => {
    return getBinaryNodeChildren(node, childTag)[0];
};
export const getAllBinaryNodeChildren = ({ content }) => {
    if (Array.isArray(content)) {
        return content;
    }
    return [];
};
export const getBinaryNodeChildBuffer = (node, childTag) => {
    const child = getBinaryNodeChild(node, childTag)?.content;
    if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
        return child;
    }
};
export const getBinaryNodeChildString = (node, childTag) => {
    const child = getBinaryNodeChild(node, childTag)?.content;
    if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
        return Buffer.from(child).toString('utf-8');
    }
    else if (typeof child === 'string') {
        return child;
    }
};
export const getBinaryNodeChildUInt = (node, childTag, length) => {
    const buff = getBinaryNodeChildBuffer(node, childTag);
    if (buff) {
        return bufferToUInt(buff, length);
    }
};
export const assertNodeErrorFree = (node) => {
    const errNode = getBinaryNodeChild(node, 'error');
    if (errNode) {
        throw new Boom(errNode.attrs.text || 'Unknown error', { data: +errNode.attrs.code });
    }
};
export const reduceBinaryNodeToDictionary = (node, tag) => {
    const nodes = getBinaryNodeChildren(node, tag);
    const dict = nodes.reduce((dict, { attrs }) => {
        if (typeof attrs.name === 'string') {
            dict[attrs.name] = attrs.value || attrs.config_value;
        }
        else {
            dict[attrs.config_code] = attrs.value || attrs.config_value;
        }
        return dict;
    }, {});
    return dict;
};
export const getBinaryNodeMessages = ({ content }) => {
    const msgs = [];
    if (Array.isArray(content)) {
        for (const item of content) {
            if (item.tag === 'message') {
                msgs.push(proto.WebMessageInfo.decode(item.content).toJSON());
            }
        }
    }
    return msgs;
};
function bufferToUInt(e, t) {
    let a = 0;
    for (let i = 0; i < t; i++) {
        a = 256 * a + e[i];
    }
    return a;
}
const tabs = (n) => '\t'.repeat(n);
export function binaryNodeToString(node, i = 0) {
    if (!node) {
        return node;
    }
    if (typeof node === 'string') {
        return tabs(i) + node;
    }
    if (node instanceof Uint8Array) {
        return tabs(i) + Buffer.from(node).toString('hex');
    }
    if (Array.isArray(node)) {
        return node.map(x => tabs(i + 1) + binaryNodeToString(x, i + 1)).join('\n');
    }
    const children = binaryNodeToString(node.content, i + 1);
    const tag = `<${node.tag} ${Object.entries(node.attrs || {})
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}='${v}'`)
        .join(' ')}`;
    const content = children ? `>\n${children}\n${tabs(i)}</${node.tag}>` : '/>';
    return tag + content;
}
const ORDER_FLOW_MAP = {
    review_and_pay: 'order_details',
    review_order: 'order_status',
    payment_info: 'payment_info',
    payment_status: 'payment_status',
    payment_method: 'payment_method'
};
const NAMED_FLOW_MAP = {
    cta_catalog: 'cta_catalog',
    mpm: 'mpm',
    call_permission_request: 'call_permission_request',
    call_request: 'call_permission_request',
    view_catalog: 'automated_greeting_message_view_catalog',
    automated_greeting_message_view_catalog: 'automated_greeting_message_view_catalog',
    wa_pay_detail: 'wa_payment_transaction_details',
    wa_payment_transaction_details: 'wa_payment_transaction_details',
    send_location: 'send_location',
    open_webview: 'open_webview',
    galaxy_message: 'galaxy_message'
};
/** Detects whether a relayed protobuf message requires biz/interactive stanza nodes. */
export const getButtonType = (message) => {
    const msgContent = message.viewOnceMessage?.message || message.viewOnceMessageV2?.message || message;
    if (msgContent.listMessage)
        return 'list';
    if (msgContent.buttonsMessage)
        return 'buttons';
    const flowMsg = msgContent.interactiveMessage?.nativeFlowMessage;
    if (!flowMsg)
        return null;
    const btn = flowMsg.buttons?.[0]?.name;
    if (btn && ORDER_FLOW_MAP[btn])
        return btn;
    return 'interactive';
};
/** Checks whether caller-supplied additionalNodes already include a biz/bot interactive wrapper. */
export const getBinaryFilteredButtons = (nodeContent) => {
    if (!Array.isArray(nodeContent))
        return false;
    return nodeContent.some(a => a.tag === 'biz' ||
        a.tag === 'bot' ||
        (Array.isArray(a.content) && a.content.some(c => c.tag === 'interactive' || c.tag === 'biz')));
};
/** Builds the `<biz>` stanza child node required by WhatsApp for nativeFlow/buttons/list messages. */
export const getButtonArgs = (message) => {
    const msgContent = message.viewOnceMessage?.message || message.viewOnceMessageV2?.message || message;
    const flowMsg = msgContent.interactiveMessage?.nativeFlowMessage;
    const btnFirst = flowMsg?.buttons?.[0]?.name;
    const ts = Math.floor(Date.now() / 1000) - 77980457;
    if (btnFirst && ORDER_FLOW_MAP[btnFirst]) {
        return [{ tag: 'biz', attrs: { native_flow_name: ORDER_FLOW_MAP[btnFirst] }, content: [] }];
    }
    const engagement = {
        tag: 'engagement',
        attrs: { customer_service_state: 'open', conversation_state: 'open' }
    };
    const bizAttrs = { actual_actors: '2', host_storage: '2', privacy_mode_ts: `${ts}` };
    if (flowMsg || msgContent.buttonsMessage) {
        const flowName = (btnFirst && NAMED_FLOW_MAP[btnFirst]) || 'mixed';
        return [
            {
                tag: 'biz',
                attrs: bizAttrs,
                content: [
                    engagement,
                    {
                        tag: 'interactive',
                        attrs: { type: 'native_flow', v: '1' },
                        content: [{ tag: 'native_flow', attrs: { v: '9', name: flowName }, content: [] }]
                    }
                ]
            }
        ];
    }
    return [{ tag: 'biz', attrs: bizAttrs, content: [engagement] }];
};
//# sourceMappingURL=generic-utils.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRolesForEmail = defaultRolesForEmail;
function defaultRolesForEmail(email) {
    const lower = (email || '').toLowerCase();
    const base = ['parent', 'staff'];
    const adminEmails = new Set(['ryanhallford.br@gmail.com', 'ryanhallford.tx@gmail.com']);
    return adminEmails.has(lower) ? [...base, 'admin'] : base;
}
//# sourceMappingURL=roles.util.js.map
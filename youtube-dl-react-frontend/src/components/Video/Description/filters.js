export const allowAny = () => true;
export const oneOf = (list) => (v) => list.includes(v);
export const exact = (v1) => (v2) => v1 === v2;
export const matches = (regex) => (v) => regex.test(v);

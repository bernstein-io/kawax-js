export default function resolve(reference, ...args) {
  // eslint-disable-next-line babel/no-invalid-this
  if (typeof reference === 'function') return reference.call(this, ...args);
  return reference;
}

const runtime = Object.create({});

export const setRuntime = (object) => Object.assign(runtime, object);

export default (object) => runtime[object] || runtime;

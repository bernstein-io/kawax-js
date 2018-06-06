const Runtime = Object.create({});

export const setRuntime = (object) => Object.assign(Runtime, object);

export default (object) => Runtime[object];

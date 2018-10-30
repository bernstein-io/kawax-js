export default async function (object) {
  const resolvedObject = {};
  const keys = Object.keys(object);
  const resolvedArray = await Promise.all(Object.values(object));
  keys.forEach((key, index) => {
    resolvedObject[key] = resolvedArray[index];
  });
  return resolvedObject;
}

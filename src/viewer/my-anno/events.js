/** @typedef {import("./annotation").Annotation} Annotation */

/** @type {Record<string, Set<Function>>} */
const events = {};

/**
 * @param {string} type
 * @param {Annotation} data
 */
export const publish = (type, data) => {
  if (type in events === false) {
    return;
  }
  for (const callback of events[type]) {
    callback(data);
  }
};

/**
 * @param {string} type
 * @param {(data: Annotation) => void} callback
 */
export const subscribe = (type, callback) => {
  if (type in events === false) {
    events[type] = new Set();
  }
  events[type].add(callback);
  return () => {
    events[type].delete(callback);
  };
};

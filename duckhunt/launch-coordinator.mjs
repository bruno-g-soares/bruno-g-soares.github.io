export function createLaunchCoordinator() {
  let active = null;
  let pending = null;
  let generation = 0;

  const start = factory => {
    if (active) return Promise.resolve(active);
    if (pending) return pending.promise;

    const id = ++generation;
    const record = { id, promise: null };
    pending = record;
    const control = {
      isCancelled: () => id !== generation,
      cancel: () => {
        if (id !== generation) return;
        generation += 1;
        active = null;
        if (pending?.id === id) pending = null;
      }
    };

    let result;
    try {
      result = factory(control);
    } catch (error) {
      if (pending?.id === id) pending = null;
      throw error;
    }

    record.promise = Promise.resolve(result)
      .then(value => {
        if (!control.isCancelled()) active = value;
        return value;
      })
      .finally(() => {
        if (pending?.id === id) pending = null;
      });
    return record.promise;
  };

  return { start };
}

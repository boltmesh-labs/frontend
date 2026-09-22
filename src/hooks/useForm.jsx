import { useState, useCallback, useRef } from 'react';

/**
 * Lightweight controlled-form state helper.
 *
 * @param {Object} initialValues
 * @param {Object} [options]
 * @param {boolean} [options.trimStart] - strip leading whitespace on change
 * @param {boolean} [options.trim] - trim the value on change
 */
export const useForm = (initialValues = {}, options = {}) => {
  const { trimStart = false, trim = false } = options;
  const [values, setValues] = useState(initialValues);

  const handleChange = useCallback(
    (e) => {
      const name = e.target.name || e.target.id;
      if (!name) return;

      let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (e.target.type !== 'checkbox') {
        if (trim) value = value.trim();
        else if (trimStart) value = value.replace(/^\s+/, '');
      }

      setValues((prev) => ({ ...prev, [name]: value }));
    },
    [trimStart, trim]
  );

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Captured at mount so `reset` keeps a stable identity (safe to list in hook
  // dep arrays even when callers pass an inline initialValues object literal)
  // while still restoring the values the form was created with.
  const initialValuesRef = useRef(initialValues);

  const reset = useCallback(() => setValues({ ...initialValuesRef.current }), []);

  return { values, handleChange, setValue, setValues, reset };
};

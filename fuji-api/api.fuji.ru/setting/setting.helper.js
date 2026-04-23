export const processSetting = (setting) => {
  const { type, value } = setting;

  let processedValue;

  switch (type) {
    case 'number':
      processedValue = Number(value);
      break;
    case 'boolean':
      processedValue = Boolean(Number(value));
      break;
    case 'json':
      try {
        processedValue = value ? JSON.parse(value) : null;
      } catch (e) {
        console.log(e);
        processedValue = null;
      }
      break;
    default:
      processedValue = value;
  }

  return { ...setting, value: processedValue };
};

export const unprocessSetting = (setting) => {
  const { type, value } = setting;

  let processedValue;

  switch (type) {
    case 'json':
      try {
        processedValue = value ? JSON.stringify(value) : null;
      } catch (e) {
        console.log(e);
        processedValue = null;
      }
      break;
    default:
      processedValue = value;
  }

  return { ...setting, value: processedValue };
};

export function latestTwelveMonthAverage(payload) {
  if (payload?.class !== 'dataset' || !Array.isArray(payload.id) || !Array.isArray(payload.size)) throw new Error('Unexpected TÜİK dataset');
  const dimensions = payload.id;
  const timeDimension = payload.dimension?.TIME_PERIOD?.category?.index;
  if (!Array.isArray(timeDimension)) throw new Error('Missing time periods');
  for (let time = timeDimension.length - 1; time >= 0; time--) {
    let flat = 0;
    for (let i = 0; i < dimensions.length; i++) {
      const id = dimensions[i], codes = payload.dimension[id]?.category?.index;
      const wanted = id === 'TIME_PERIOD' ? timeDimension[time] : id === 'DEGISIM' ? '5' : id === 'REF_AREA' ? 'TR' : id === 'COICOP_2018' ? '0' : id === 'INDICATOR' ? 'F_TFE' : Array.isArray(codes) && codes.length === 1 ? codes[0] : null;
      const position = Array.isArray(codes) ? codes.indexOf(wanted) : -1;
      if (position < 0) throw new Error(`Unexpected TÜİK dimension: ${id}`);
      flat = flat * payload.size[i] + position;
    }
    const percentage = Number(payload.value?.[flat]);
    if (Number.isFinite(percentage) && percentage >= 0 && percentage <= 1000) return {percentage,period:timeDimension[time]};
  }
  throw new Error('No 12-month average CPI observation');
}

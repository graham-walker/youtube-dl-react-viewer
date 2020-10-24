import { PREFIX } from './parseCustomNode';

export const parseStringToDom = (str) => {
  const wrapped = str
    .split(/(\s+)/)
    .map((fragment, idx) => {
      return idx % 2
        ? fragment
        : fragment
            .replace(
              /^https?:\/\/\S+$/g,
              (m) => `<${PREFIX}externallink>${m}</${PREFIX}externallink>`
            )
            .replace(
              /^#\w*[a-zA-Z]\w*$/g,
              (m) => `<${PREFIX}hashtag>${m}</${PREFIX}hashtag>`
            ).replace(
                /(?:^|\s)([0-5]?\d(?::(?:[0-5]?\d)){1,2})/g,
                (match, p1) => {
                    let seconds = 0;
                    let i = 1;
                    for (let unit of p1.split(':').reverse()) {
                        seconds += unit * i;
                        i *= 60;
                    }
                    return `<${PREFIX}settime time="${seconds}">${p1}</${PREFIX}settime>`;
                }
            );
    })
    .join('');

  const dom = new DOMParser().parseFromString(`${wrapped}`, 'text/html');

  return [...dom.body.childNodes];
};

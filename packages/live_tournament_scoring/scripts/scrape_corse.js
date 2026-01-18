// https://golfbert.com/courses/holes/13555

const courseData = document.querySelectorAll(".bg-site-nav-link");

JSON.stringify(
  Array.from(courseData).reduce((acc, node, i) => {
    const children = node.children;
    const KEY_MAP = { 1: "par", 3: "handicap" };
    const TRANSFORMER_MAP = {
      par: (str) => +str.split("Par").filter(Boolean)[0]?.trim(),
      handicap: (str) => +str.split("Hcp").filter(Boolean)[0]?.trim(),
    };

    const data = Array.from(children).reduce((_acc, child, j) => {
      const key = KEY_MAP[j];
      if (!key) {
        return _acc;
      }

      const value = TRANSFORMER_MAP[key]
        ? TRANSFORMER_MAP[key](child.innerHTML)
        : child.innerHTML;

      return { ..._acc, [key]: value };
    }, {});

    return { ...acc, [i]: data };
  }, {})
);

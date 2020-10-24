import React from "react";
import { allow } from "./allow";
import { parseCustomNode } from "./parseCustomNode";

export const mapDomToReact = (node, idx, player) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return <React.Fragment key={idx}>{node.data}</React.Fragment>;
  }

  const customNode = parseCustomNode(node, idx, player);

  if (customNode) return customNode;

  const allowed = allow.find(
    (item) => item.tag.toUpperCase() === node.nodeName
  );

  if (!allowed) {
    const inner = node.innerHTML;
    const outer = node.outerHTML;

    const idxOfInner = outer.indexOf(inner);

    const startTag = outer.slice(0, idxOfInner);
    const endTag = outer.slice(idxOfInner + inner.length);

    return (
      <React.Fragment key={idx}>
        <React.Fragment key={-1}>{startTag}</React.Fragment>
        {[...node.childNodes].map((n, i) => mapDomToReact(n, i))}
        <React.Fragment key={node.childNodes.length}>{endTag}</React.Fragment>
      </React.Fragment>
    );
  }

  const El = node.nodeName.toLowerCase();

  const props = {};

  for (const { name, value } of node.attributes) {
    const match = allowed.allowAttributes?.find(([key]) => key === name);

    if (!match) continue;

    const [, validate] = match;

    if (validate(value)) {
      props[name] = value;
    }
  }

  return node.textContent ? (
    <El key={idx} {...props}>
      {[...node.childNodes].map((n, i) => mapDomToReact(n, i))}
    </El>
  ) : (
    <El key={idx} {...props} />
  );
};

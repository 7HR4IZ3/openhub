# OpenHub compact source reader concept 05

This is a standalone mockup. It does not replace the production repository reader.

The concept keeps the useful source browsing structure—stable repository context, visible ref switching, an explorer next to the code, line numbers, progressive context, and fast in-place file changes—then compresses it into a smaller workbench:

- one 52px product bar instead of a large repository hero;
- one 54px source strip for path, ref, and actions;
- a 208px file explorer and a reader that gets the remaining width;
- no duplicate explanatory headers or large metadata cards;
- context opens as a narrow drawer and disappears when it is not needed;
- mobile keeps the source visible, with a persistent files button and icon-only bottom navigation.
- the active branch and full file location stay visible at every size;
- folders reveal their children in place, while selecting a file updates the reader without a page reload;
- icon-only controls keep an accessible label and tooltip, while task controls retain a short visible label;
- notes and history use compact rows so secondary views remain scannable.
- search inputs use a 16px mobile type size to avoid iOS focus zoom.

The visual language is OpenHub-specific: charcoal surfaces, ember signal color, quiet separators, compact monospace labels, and a code pane that behaves like the primary product surface.

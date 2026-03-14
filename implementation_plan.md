# Implementation Plan

[Overview]
The goal is to fully integrate the new clinic SVG and PNG assets from the `clinic_svg_pack` folder into the Next.js frontend application.

This implementation will fix broken SVG wrappers by copying their required PNG dependencies, add new grader badge images to the public assets, and update the application's constants and components to utilize these new visual assets. This will enhance the visual appeal of the dashboard and tool pages by replacing generic icons with custom-designed clinic-themed graphics.

[Types]
Update the `ClinicSvgName` type to include the new image assets.

The `ClinicSvgName` type in `ptbiztools-next/src/constants/clinic-svgs.ts` will be implicitly updated when we add new keys to the `CLINIC_SVGS` constant object. No explicit type definition changes are needed as it uses `keyof typeof CLINIC_SVGS`.

[Files]
Copy missing assets and update configuration files.

- New files to be created (copied from `clinic_svg_pack`):
  - `ptbiztools-next/public/clinic-icons/*.png` (all PNG files required by the SVGs)
  - `ptbiztools-next/public/assets/graders/discallgrader.png`
  - `ptbiztools-next/public/assets/graders/salesgrader.png`
  - `ptbiztools-next/public/assets/graders/plgrader.png`
  - `ptbiztools-next/public/assets/graders/compgrader.png`
- Existing files to be modified:
  - `ptbiztools-next/src/constants/clinic-svgs.ts`: Add new image paths to the constant.
  - `ptbiztools-next/src/constants/tool-badges.ts`: Update to use the new local grader images.
  - `ptbiztools-next/src/components/dashboard/ToolGrid.tsx`: Update to use the new badges and potentially replace Lucide icons with custom clinic icons.

[Functions]
No significant function logic changes required.

- Modified functions:
  - `ToolGrid` component in `ptbiztools-next/src/components/dashboard/ToolGrid.tsx`: Update the `tools` array definition to use the new assets.

[Classes]
No class modifications required.

[Dependencies]
No dependency modifications required.

[Testing]
Verify assets load correctly in the browser.

- Run the Next.js development server.
- Navigate to the dashboard (`/dashboard`) and verify that all tool cards display their respective custom badges and icons correctly without broken image links.
- Verify that the SVGs that wrap PNGs (like `analytics_strip.svg`) now render correctly since their PNG dependencies are present.

[Implementation Order]
1. Execute shell commands to copy all `.png` and `.jpg` files from `clinic_svg_pack` to `ptbiztools-next/public/clinic-icons/`.
2. Execute shell commands to copy the specific grader PNGs (`discallgrader.png`, `salesgrader.png`, `plgrader.png`, `compgrader.png`) to `ptbiztools-next/public/assets/graders/` (creating the directory if it doesn't exist).
3. Update `ptbiztools-next/src/constants/clinic-svgs.ts` to include references to the new images.
4. Update `ptbiztools-next/src/constants/tool-badges.ts` to ensure it points to the correct local paths for the grader badges.
5. Update `ptbiztools-next/src/components/dashboard/ToolGrid.tsx` to utilize the new assets effectively.

---
name: catalog-doc
description: "Domain rules and content standards for validating CatalogInformation/README.md files published on dataminer.services. Load this skill when writing or reviewing catalog documentation."
---

# Catalog Documentation Domain Rules

This file contains the **authoritative domain knowledge** for validating CatalogInformation README files. It defines what constitutes correct, complete, and high-quality documentation for Catalog items published on dataminer.services.

This skill does not define activation behavior, file discovery, output formatting, or issue/PR creation. Those are handled by the agent that loads this skill.

---

## Severity Levels

All validation rules in this file use the following severity indicators:

- `[ERROR]` — must be present/absent; blocks publication
- `[WARNING]` — should be present/absent; degrades quality
- `[INFO]` — informational guidance

---

## Validation Rules

### README Existence

**[ERROR]** `CatalogInformation/README.md` MUST exist. This is the README displayed on the Catalog item page — for extensive technical detail, use the `documentation_url` field in the manifest to link externally.

### About Section

**[ERROR]** MUST be present. MUST summarize what makes the item valuable, why users should deploy it, and what problems it solves.

**[WARNING]** SHOULD use accessible language for both technical and non-technical readers, highlight important points with bold text, and keep tone professional. MUST NOT include excessive technical detail, generic DataMiner capabilities, or duplicate content from Key Features.

### Key Features Section

**[ERROR]** MUST be present. MUST contain a maximum of **5 features** using direct, benefit-oriented language with action verbs (e.g., "Monitor", "Track", "Detect", "Automate").

**[WARNING]** MUST NOT describe generic DataMiner capabilities or include vague descriptors (e.g., "high-performance") without specific context.

### Use Cases Section

**[WARNING]** When included, SHOULD demonstrate practical real-world scenarios using specific, non-hypothetical examples relevant to the typical user base. May link to a use case on DataMiner Dojo. MUST NOT duplicate Key Features content.

### Prerequisites Section

**[WARNING]** When included, SHOULD ensure users can find the minimum DataMiner version requirements — either by stating the version inline using **both** Feature Release and Main Release version numbers, or by providing an explicit link to release notes or versioned documentation where that information is available. SHOULD also list required licenses, soft-launch options, and component dependencies. MUST NOT include complex installation or configuration steps — link to documentation instead.

### Technical Reference Section

**[WARNING]** When included, SHOULD link to detailed external documentation using the `documentation_url` manifest field. MUST NOT duplicate content already available elsewhere or document UI details that change frequently. When documentation is available externally, include a concise equipment/connector list (supported devices, protocols) — this list MUST NOT be removed.

### Visuals

**[WARNING]** When included, visuals SHOULD be stored in the `Images` folder (correct casing), limited to a maximum of **3**, and be clear and high quality. GIFs SHOULD be at most **10 seconds** and focused on one specific feature.

**[WARNING]** Visuals MUST NOT be blurry, show sensitive data, display unnecessary open panels, or contain unnecessary blank space.

**[ERROR]** Image paths MUST use `./Images/filename.png` format (relative path, capital I). Paths using `~/images/` are invalid on catalog.dataminer.services and MUST be corrected. Images MUST NOT be removed when fixing paths — only the path format should be updated.

### Contact and Support

**[ERROR]** MUST NOT include support contacts or team email addresses. Direct users to the [DataMiner Support team](https://docs.dataminer.services/dataminer/Troubleshooting/Contacting_tech_support.html). Owner email addresses belong in `manifest.yml`, not in documentation.

---

## Content to Include and Avoid

| Include | Avoid |
|---|---|
| Value-focused About section | Generic DataMiner capabilities (alarming, trending) |
| Up to 5 specific, benefit-oriented Key Features | More than 5 Key Features |
| Real-world, non-hypothetical Use Cases | Hypothetical or irrelevant scenarios |
| DataMiner version inline (both FR and MR tracks) **or** explicit link to release notes in Prerequisites | Complex installation steps in Prerequisites |
| Links to external documentation | Duplicating external documentation inline |
| Concise equipment/connector list in Technical Reference | Removing equipment lists when fixing other issues |
| High-quality visuals (max 3, GIFs max 10 s) | Blurry, sensitive, or irrelevant visuals |
| Image paths as `./Images/filename.png` | Paths using `~/images/` prefix |
| DataMiner Support team link | Support contacts or email addresses |

---

## Common Issues and Solutions

| Issue | Severity | Solution |
|-------|----------|----------|
| No `CatalogInformation/README.md` | ERROR | Create the README with About and Key Features sections at minimum |
| About section missing | ERROR | Add an About section summarizing the item's value and the problems it solves |
| Key Features section missing | ERROR | Add a Key Features section with up to 5 benefit-oriented, item-specific features |
| Support or contact details in documentation | ERROR | Remove and direct users to the DataMiner Support team |
| Image path uses `~/images/` prefix | ERROR | Change to `./Images/filename.png` — fix the path, never remove the image |
| Key Features section contains more than 5 items | WARNING | Trim to the 5 most differentiating features |
| Key Features describe generic DataMiner capabilities | WARNING | Replace with features specific to this item |
| About section contains excessive technical detail | WARNING | Move to Technical Reference and link out instead |
| About section duplicates Key Features content | WARNING | Restructure so About gives the value overview and Key Features lists specifics |
| Use Cases section missing for non-trivial items | WARNING | Add specific, real-world scenarios showing the item's value |
| Prerequisites section missing when dependencies exist | WARNING | Add concise prerequisites — include the DataMiner version (both FR and MR tracks) inline, or link explicitly to release notes where those versions are documented |
| Version information not discoverable in Prerequisites | WARNING | Either state both Feature Release and Main Release version numbers inline, or add an explicit link to release notes or versioned documentation where users can find them |
| Technical Reference missing when detailed docs exist | WARNING | Link to external documentation using the `documentation_url` manifest field |
| Equipment/connector list removed from Technical Reference | WARNING | Restore the list — concise supported equipment lists must be preserved |
| Visuals missing | WARNING | Add up to 3 relevant, high-quality images or GIFs illustrating key features |
| Visuals show sensitive or irrelevant data | WARNING | Blur sensitive data; hide irrelevant columns and close unnecessary panels |
| GIF longer than 10 seconds | WARNING | Trim or re-record to focus on one feature or action |
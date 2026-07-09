# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently as a standalone slice]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [...]

**Independent Test**: [...]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with a priority]

### Edge Cases

- What happens when [boundary condition]?
- How does the system handle [error scenario]?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]

*Mark ambiguous requirements: [NEEDS CLARIFICATION: specific question]*

### Constitution Alignment *(mandatory — Gatepass)*

- **Finding tiers touched**: [verified / research-tier / none] — if any, state how tier
  integrity is preserved (Principle II)
- **Surfaces read**: [app code / agent code / MCP server impl / tool definitions / permission
  scopes / none] (Principle IV)
- **Writes to customer code or CI?**: [no / describe the human-approval flow] (Principle III)
- **Precision impact**: [none / new or changed rules — corpus fixtures and measured TP/FP
  required] (Principles I, V)

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes]
- **[Entity 2]**: [What it represents, relationships]

## Success Criteria *(mandatory)*

Measurable, technology-agnostic outcomes. Where the feature adds or changes detection rules,
criteria MUST include a precision target against the versioned corpus.

- **SC-001**: [Measurable outcome, e.g., "Rule pack X achieves ≥95% TP rate on corpus vY"]
- **SC-002**: [Measurable outcome, e.g., "Users complete scan-to-first-finding in under N min"]

## Assumptions *(optional)*

- [Assumption made where the description was ambiguous]

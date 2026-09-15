const express = require("express");
const router = express.Router();
const { personas } = require("../blockchain");

// In-memory or session active persona for demo
let activePersonaId = "ADMIN";

/**
 * GET /api/auth/personas
 * List the three explicit demo personas defined in PRD
 */
router.get("/personas", (req, res) => {
  const personaList = Object.values(personas).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    department: p.department,
    designation: p.designation,
    address: p.address,
    did: `did:bel:${p.address}`,
    isActive: p.id.toUpperCase() === activePersonaId.toUpperCase(),
  }));

  res.json({
    activePersonaId,
    personas: personaList,
  });
});

/**
 * POST /api/auth/switch
 * Switch active demo persona (Admin, R. Sharma, A. Verma)
 */
router.post("/switch", (req, res) => {
  const { personaId } = req.body;
  if (!personaId) {
    return res.status(400).json({ error: "personaId is required" });
  }

  const key = personaId.toUpperCase();
  if (!personas[key]) {
    return res.status(404).json({ error: `Persona ${personaId} not found` });
  }

  activePersonaId = key;
  const p = personas[key];

  res.json({
    message: `Switched active persona to ${p.name}`,
    activePersona: {
      id: p.id,
      name: p.name,
      role: p.role,
      department: p.department,
      designation: p.designation,
      address: p.address,
      did: `did:bel:${p.address}`,
    },
  });
});

/**
 * GET /api/auth/current
 */
router.get("/current", (req, res) => {
  const p = personas[activePersonaId] || personas.ADMIN;
  res.json({
    id: p.id,
    name: p.name,
    role: p.role,
    department: p.department,
    designation: p.designation,
    address: p.address,
    did: `did:bel:${p.address}`,
  });
});

module.exports = {
  router,
  getActivePersonaId: () => activePersonaId,
};

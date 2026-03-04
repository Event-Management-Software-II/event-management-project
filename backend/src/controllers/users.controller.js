const pool = require('../db/pool')

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u."id_user" AS id, u."fullName" AS name, u."email",
             u."created_at", r."nameRole" AS role
      FROM "User" u
      JOIN "Role" r ON u."id_role" = r."id_role"
      WHERE u."deleted_at" IS NULL
      ORDER BY u."created_at" DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

module.exports = { getUsers }
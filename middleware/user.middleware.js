export const authMiddlewaree = (req, res, next) => {
  // example: decode JWT
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = { id: payload.id };
  next();
}

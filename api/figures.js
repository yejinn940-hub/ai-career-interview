const { getFigures } = require('./_figures');

module.exports = async function handler(req, res) {
  try {
    const figures = await getFigures();
    const list = figures.map(function (f) {
      return { id: f.id, name: f.name, job: f.job, photo: f.photo || null };
    });
    res.status(200).json({ figures: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '면담 인물 목록을 불러오지 못했어요.' });
  }
};

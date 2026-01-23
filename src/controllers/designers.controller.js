import Profile from "../model/profile.model.js"

const getDesigners = async (req, res) => {
    const response = await Profile.select("id, first_name, last_name").where("role", "designer").get();
    res.statusCode = 200;
    res.end(JSON.stringify(response));
}

const getDesignerById = async (req, res) => {
    const response = await Profile.find(req.params.id);
    res.statusCode = 200;
    res.json(JSON.stringify(response));
}

export {
    getDesigners,
    getDesignerById
}
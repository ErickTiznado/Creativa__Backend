
const testPost = (req, res) => {
    const data = req.body;
    console.log(data);
    res.json({
        message: "Post Exitoso",
        data: JSON.stringify(data)
    })
}

export default testPost;

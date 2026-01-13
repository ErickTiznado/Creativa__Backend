import Nicola, { Regulator } from "nicola-framework";

Regulator.load()

const app = new Nicola()


app.listen(3000, () =>{
    console.log('Servidor corriendo en el puerto 3000')
})
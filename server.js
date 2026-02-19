const http = require("http")

const script = `
print("Hello from private script")
`

const server = http.createServer((req,res)=>{
    const url = new URL(req.url,"http://localhost")
    const key = url.searchParams.get("key")

    if(key !== "123"){
        res.end("DENIED")
        return
    }

    res.end(script)
})

server.listen(3000)

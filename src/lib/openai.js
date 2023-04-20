const { Configuration, OpenAIApi } = require('openai')

module.exports = {
    async getResponseChatGPT(prompt) {
        const apiKey = process.env.OPEN_AI_API_KEY
        const configuration = new Configuration({ apiKey })
        const openai = new OpenAIApi(configuration)

        const model = 'gpt-3.5-turbo'
        const messages = [{
                role: 'user',
                content: prompt
        }]

        const completion = await openai.createChatCompletion({ model, messages })
        console.log("\n-+-+-+-+-+-+-+-+-+-+-+-+-+++-+-+-+-+- 0000000000000000");
        console.log(completion)
        console.log("-+-+-+-+-+-+-+-+-+-+-+-+-+++-+-+-+-+- 1111111111111111");
        console.log(completion.data)
        console.log("-+-+-+-+-+-+-+-+-+-+-+-+-+++-+-+-+-+- 222222222222222");
        console.log(completion.data.choices[0])
        console.log("-+-+-+-+-+-+-+-+-+-+-+-+-+++-+-+-+-+- 3333333333333333");
        return completion.data.choices[0].message.content;
    }

}
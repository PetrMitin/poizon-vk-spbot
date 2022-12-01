const {VK} = require('vk-io') 

const parseUserApiToken = (link) => link.split('access_token=')[1].split('&')[0]

const postToGroup = async (groupId, token, text) => {
    try {
        const user = new VK({token})
        await user.updates.start()
        return console.log(await user.api.wall.post({
            owner_id: '-' + groupId,
            message: text,
            from_group: 0
        }))
    } catch (e) {
        console.log(e);
        console.log(`Аккаунт ${token} не рабочий`);
    }
}

const spamToGroup = async (groupId, tokensArr, text) => {
    return await Promise.all(tokensArr.map(async (token) => {
        return postToGroup(groupId, token, text)
    }))
}

const spamToGroups = async (groupsArr, tokensArr, text, reps, cb) => {
    let i = 0;
    const interval = setInterval(async () => {
        if (i >= reps) return (async () => {
            await cb()
            clearInterval(interval)
        })()
        await spamToGroup(groupsArr[i % groupsArr.length], tokensArr, text)
        i++
    }, 60000)
}

const spamToGroupsForReps = async (groupsArr, tokensArr, text, reps) => {
    
}

module.exports = {
    parseUserApiToken,
    spamToGroups
}
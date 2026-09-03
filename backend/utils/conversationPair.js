function getCanonicalConversationPair(firstUserId, secondUserId) {
  const participants = [firstUserId, secondUserId].sort((first, second) =>
    first.toString().localeCompare(second.toString()),
  );

  return {
    participantA: participants[0],
    participantB: participants[1],
    participants,
  };
}

module.exports = { getCanonicalConversationPair };

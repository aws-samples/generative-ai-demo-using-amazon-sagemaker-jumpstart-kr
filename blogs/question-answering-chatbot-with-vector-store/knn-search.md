# k-NN Search

현재 OpenSearch를 RAG로 설정시에 engine 기본값은 nmslib이며 faiss, Lucene를 선택할 수 있습니다.

[Approximate k-NN search](https://opensearch.org/docs/latest/search-plugins/knn/approximate-knn/)를 참조하여 비교하면 아래와 같습니다.

### nmslib
- 일반적으로 nmslib가 faiss나 Lucene보다 더 낳은 성능을 가집니다.
- maximum dimension count: 16000

### faiss
- indexing의 throughput을 최적화하는데 유리합니다.
- maximum dimension count: 16000

### Lucene
- 비교적 작은 dataset(최대 수백만 vectors)에서 latency나 recall에서 더 좋은 성능을 가집니다.
- pure java로 만들어졌습니다.
- maximum dimension count가 1024로 작습니다.


-- 타임테이블 탭 '배치도 · 참고 그림'에 운영석 C안 배치도 넣기 (이미 있으면 그대로)
update meta set data = jsonb_set(data, '{imgs}',
  coalesce(data->'imgs','[]'::jsonb) || '[{"id":"files/tt-seat-c.png","name":"운영석 C안 · 아린 님 순서 (테이블 1개 = 1팀)"}]'::jsonb)
where id = 'tt' and not coalesce(data->'imgs','[]'::jsonb) @> '[{"id":"files/tt-seat-c.png"}]'::jsonb;
select jsonb_array_length(data->'imgs') as imgs from meta where id='tt';

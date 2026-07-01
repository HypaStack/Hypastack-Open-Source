-module(hypasched_r2).

%% Deletes objects from R2 via a hand-rolled SigV4-signed S3 DeleteObject
%% (path-style, region "auto"). Only DELETE is needed here, so no SDK dep.

-export([delete_object/1]).

-spec delete_object(binary()) -> ok | {error, term()}.
delete_object(Key) when is_binary(Key) ->
    case creds() of
        {error, Missing} ->
            {error, {missing_env, Missing}};
        {ok, Host, Bucket, AccessKey, Secret} ->
            do_delete(Host, Bucket, AccessKey, Secret, Key)
    end.

creds() ->
    Account = hypasched_env:get("R2_ACCOUNT_ID"),
    AccessKey = hypasched_env:get("R2_ACCESS_KEY_ID"),
    Secret = hypasched_env:get("R2_SECRET_ACCESS_KEY"),
    Bucket = hypasched_env:get("R2_BUCKET_NAME"),
    case lists:member(undefined, [Account, AccessKey, Secret, Bucket]) of
        true -> {error, r2_credentials};
        false ->
            Jur = hypasched_env:get("R2_JURISDICTION", <<"global">>),
            Host = case string:lowercase(Jur) of
                <<"global">> -> <<Account/binary, ".r2.cloudflarestorage.com">>;
                <<>> -> <<Account/binary, ".r2.cloudflarestorage.com">>;
                J -> <<Account/binary, ".", J/binary, ".r2.cloudflarestorage.com">>
            end,
            {ok, Host, Bucket, AccessKey, Secret}
    end.

do_delete(Host, Bucket, AccessKey, Secret, Key) ->
    Path = uri_encode_path(<<"/", Bucket/binary, "/", Key/binary>>),
    {AmzDate, DateStamp} = amz_dates(),
    EmptyHash = hex(crypto:hash(sha256, <<>>)),

    CanonicalHeaders = <<"host:", Host/binary, "\n",
                         "x-amz-content-sha256:", EmptyHash/binary, "\n",
                         "x-amz-date:", AmzDate/binary, "\n">>,
    SignedHeaders = <<"host;x-amz-content-sha256;x-amz-date">>,
    CanonicalRequest = <<"DELETE\n", Path/binary, "\n\n",
                         CanonicalHeaders/binary, "\n",
                         SignedHeaders/binary, "\n", EmptyHash/binary>>,

    Scope = <<DateStamp/binary, "/auto/s3/aws4_request">>,
    StringToSign = <<"AWS4-HMAC-SHA256\n", AmzDate/binary, "\n", Scope/binary, "\n",
                     (hex(crypto:hash(sha256, CanonicalRequest)))/binary>>,

    KDate = hmac(<<"AWS4", Secret/binary>>, DateStamp),
    KRegion = hmac(KDate, <<"auto">>),
    KService = hmac(KRegion, <<"s3">>),
    KSigning = hmac(KService, <<"aws4_request">>),
    Signature = hex(hmac(KSigning, StringToSign)),

    Authorization = <<"AWS4-HMAC-SHA256 Credential=", AccessKey/binary, "/", Scope/binary,
                      ", SignedHeaders=", SignedHeaders/binary,
                      ", Signature=", Signature/binary>>,

    HostStr = binary_to_list(Host),
    Url = "https://" ++ HostStr ++ binary_to_list(Path),
    Headers = [
        {"x-amz-date", binary_to_list(AmzDate)},
        {"x-amz-content-sha256", binary_to_list(EmptyHash)},
        {"authorization", binary_to_list(Authorization)}
    ],
    HttpOpts = [
        {timeout, 30000},
        {connect_timeout, 10000},
        {ssl, ssl_opts(HostStr)}
    ],
    case httpc:request(delete, {Url, Headers}, HttpOpts, [{body_format, binary}]) of
        {ok, {{_, Status, _}, _RespHeaders, _Body}} when Status >= 200, Status < 300 ->
            ok;
        %% S3 semantics: deleting a nonexistent key is a success (204), but be
        %% lenient about 404 in case of intermediary behavior.
        {ok, {{_, 404, _}, _RespHeaders, _Body}} ->
            ok;
        {ok, {{_, Status, _}, _RespHeaders, Body}} ->
            {error, {http_status, Status, Body}};
        {error, Reason} ->
            {error, Reason}
    end.

ssl_opts(Host) ->
    [
        {verify, verify_peer},
        {cacerts, public_key:cacerts_get()},
        {server_name_indication, Host},
        {depth, 3},
        {customize_hostname_check,
         [{match_fun, public_key:pkix_verify_hostname_match_fun(https)}]}
    ].

amz_dates() ->
    {{Y, Mo, D}, {H, Mi, S}} = calendar:universal_time(),
    AmzDate = iolist_to_binary(io_lib:format(
        "~4..0B~2..0B~2..0BT~2..0B~2..0B~2..0BZ", [Y, Mo, D, H, Mi, S])),
    DateStamp = iolist_to_binary(io_lib:format("~4..0B~2..0B~2..0B", [Y, Mo, D])),
    {AmzDate, DateStamp}.

hmac(Key, Data) ->
    crypto:mac(hmac, sha256, Key, Data).

hex(Bin) ->
    binary:encode_hex(Bin, lowercase).

%% AWS canonical URI encoding: RFC 3986 unreserved characters and "/" pass
%% through, everything else becomes uppercase %XX (per byte).
uri_encode_path(Path) ->
    << <<(enc_byte(B))/binary>> || <<B>> <= Path >>.

enc_byte(B) when B >= $A, B =< $Z; B >= $a, B =< $z; B >= $0, B =< $9 -> <<B>>;
enc_byte(B) when B =:= $-; B =:= $.; B =:= $_; B =:= $~; B =:= $/ -> <<B>>;
enc_byte(B) ->
    iolist_to_binary(io_lib:format("%~2.16.0B", [B])).
